# Cell Simulator structure explorer — 2026-09-19

Centering now keeps the actual selected individual of a species, prioritizing the controlled organism in play mode. Finding another individual is only necessary when the requested species differs from the current one.

Play-mode label activation now waits for pointer release. The observation-mode protections also apply to play: touch jitter tolerance, latched drag intent, cancellation and pointer ownership. Play gestures do not pan the camera. Canceled gestures and out-and-back drags do not record anatomy evidence.

Explanations now appear in a normal document panel below the microscope, leaving the specimen and leaders visible. Text is available to assistive technology and grows naturally with its content. Previous and Next wrap through the current specimen's anatomy without recentering or replacing it. Explanations remain available until explicitly dismissed, the active specimen changes, or movement resumes in play. Close and Escape return focus to the canvas. Panel keyboard actions are isolated from play movement shortcuts.

Validation: 26 focused unit tests passed, including four specimen-identity cases. Browser review covers external-panel geometry at 320/1200px, keyboard navigation and focus, circular Previous/Next navigation, preserved camera/specimen state, selection changes, completed/canceled/dragged play gestures, persistent reading beyond the former five-second limit, and isolated panel keys. Existing hover/selection tests passed. The phone panel screenshot was visually reviewed. All 12 distinct browser tests passed, including the final combined nine-test motion/touch/panel run. Syntax, scoped whitespace checks and desktop public mirror parity passed.

No push or deployment performed.
