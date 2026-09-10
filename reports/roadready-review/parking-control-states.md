# Clear parking control states

The shared parking control component now follows the live practice state without restarting the simulation.

- Pause and resume have distinct labels; keyboard focus stays on the same button when the label changes.
- Driving and securing buttons are disabled while paused or while Controls is open. Securing also waits for held driving inputs to return to neutral.
- Completed practice shows disabled “Practice complete” and “Parking secured” controls. Reset remains available and restores active controls.
- Active attempts to secure an invalid position remain available so the instructor can explain the correction.
- Buttons use consistent sizing, borders, and disabled styling. Existing touch-control visibility preferences remain supported.

Validation: seven browser tests passed. These cover Standard Parallel and Tight Parallel state transitions, the full guided maneuver, pause/queued-input protection, custom keyboard mappings and hidden controls, analog controller input and disconnect, and settings suspension in the driving view. Reviewed the completed phone layout in `parking-controls-complete.png`. JavaScript syntax, whitespace checks, and canonical/nested desktop asset parity passed.

Changes are local and undeployed.
