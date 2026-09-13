# Cell Simulator label refinements

Labels retain their rows and sides as organelles rotate. Hovering or selecting a label now emphasizes its connector and marks the corresponding structure with a steady ring. The selected emphasis stays visible while its explanation is open, including when opened from the keyboard-accessible anatomy list.

Explanations belong to their specific specimen and clear when selection changes, when labels are hidden, or when dismissed. Timed play explanations clear before label rendering so paused canvases cannot retain an expired selection outline.

Validation: 19 focused unit tests passed across anatomy layout, illustration geometry, and canvas lifecycle. Five distinct browser tests passed: motion stability at 1200px/320px; hover, selection, Escape, anatomy-list focus, specimen switching, label visibility and deselection at 1200px/320px; play hover/selection and paused expiry at 390px. The final three focus tests passed again with reduced motion for deterministic coordinate checks. Phone hover and selected screenshots were visually inspected. Source syntax, desktop-public mirror parity and scoped diff checks passed.

Screenshots: hover-1200.png, hover-320.png, selected-1200.png, selected-320.png.

No deployment performed.
