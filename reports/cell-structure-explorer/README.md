# Cell Simulator structure explorer — 2026-09-19

Centering now keeps the actual selected individual of a species, prioritizing the controlled organism in play mode. Finding another individual is only necessary when the requested species differs from the current one.

Play-mode label activation now waits for pointer release. The observation-mode protections also apply to play: touch jitter tolerance, latched drag intent, cancellation and pointer ownership. Play gestures do not pan the camera. Canceled gestures and out-and-back drags do not record anatomy evidence.

Explanations now appear in a normal document panel below the microscope, leaving the specimen and leaders visible. Text is available to assistive technology and grows naturally with its content. Previous and Next wrap through the current specimen's anatomy without recentering or replacing it. Explanations remain available until explicitly dismissed, the active specimen changes, or movement resumes in play. Close and Escape return focus to the canvas. Panel keyboard actions are isolated from play movement shortcuts.

Validation: 26 focused unit tests passed, including four specimen-identity cases. Browser review covers external-panel geometry at 320/1200px, keyboard navigation and focus, circular Previous/Next navigation, preserved camera/specimen state, selection changes, completed/canceled/dragged play gestures, persistent reading beyond the former five-second limit, and isolated panel keys. Existing hover/selection tests passed. The phone panel screenshot was visually reviewed. All 12 distinct browser tests passed, including the final combined nine-test motion/touch/panel run. Syntax, scoped whitespace checks and desktop public mirror parity passed.

No push or deployment performed.

## Visual refinement — 2026-09-19

The explorer now has a lightly tinted specimen header with a cell emblem, a larger structure heading, comfortable reading width, and a position marker showing the current structure (not completion). Previous and Next use directional icons; Next is the primary action and Close is visually quieter. On narrow cards Close wraps below the navigation pair. All actions retain at least 44px targets and visible keyboard focus; the position marker also uses shape and text rather than color alone.

Visually reviewed rendered cards at 280px and 1200px. Expanded the existing browser review to 280/320/1200px, checking target dimensions and the active position marker alongside navigation, focus, overflow and camera preservation. Refreshed screenshots include both selected and empty states. The four source/public/build copies are byte-identical; syntax and scoped whitespace checks pass. All 26 focused unit checks pass.
All 13 browser scenarios passed in the combined explorer, label focus, label stability and touch run. No push or deployment.
Commit attempt blocked by unrelated existing content_engine_source.jsx / desktop/web-app/src/content_engine_source.jsx drift in the repository-wide hook. Other work left untouched; hook not bypassed.

## Microscope focus refinement — 2026-09-19

Selected organelle labels now use the explorer's dark green with white text and a white outer keyline. Hover previews retain their light fill. Selected leaders draw last and use a stronger stroke; neutral leaders use a consistent muted green with a white underlay, removing the competing species-color lines. Rounded line joins and slightly softer pill corners match the explorer card. Label bounds, wrapping, stable placement, hit targets and selection behavior are unchanged. No animation was added.

Reviewed refreshed phone and desktop microscope screenshots in reports/cell-label-focus. All 26 focused unit checks pass after updating the selected-fill and selected-text rendering assertions; one transient initial runner error cleared on rerun. The unrelated source-pair mismatch remains in content_engine_source.jsx and its desktop duplicate; those files were not altered.
All nine label-focus, stability and touch browser scenarios passed (280/320/390/1200px coverage). Syntax, scoped whitespace and four-way mirror hashes passed.

## Direct structure navigation — 2026-09-19

Added a keyboard-accessible Jump to structure picker alongside the specimen header. It uses the existing organelle selection path and preserves the selected individual, camera position and zoom. Selecting through the picker restores hidden observation labels. The picker and specimen-note cards track selection from all entry points; the current card has an inset stripe, tinted background, visible Selected in live dish text and aria-current. Changing specimens or closing an explanation clears the selection indicator. Escape in the native picker is left to the control, while Close and other panel Escape handling retain their existing focus behavior.

The expanded browser scenarios cover direct selection at 280/320/1200px, preserved camera and focus, selected card semantics, specimen-specific options, clearing and hidden-label recovery; play-mode coverage checks picker focus and Escape. All 26 focused unit checks passed. Visual review caught a selector collision with the existing Inside the Cell structure grid. The explorer now uses a distinct data-cell-explanation-picker hook, keeping the two layouts independent. Final browser review also checks available mobile width.
Final four browser scenarios passed after separating the selectors. Reviewed the 280px and desktop explorer and the selected phone anatomy card. A prior desktop run reached its teardown timeout under host load; the final unchanged scenario passed. No push or deployment.

## Return to the microscope — 2026-09-19

Added Back to dish (accessible name: Back to microscope) beside the structure navigation controls. It scrolls to the microscope and moves keyboard focus to its canvas through the existing reduced-motion-aware focus helper. It leaves the selected structure, explanation, zoom, camera, selected individual and play evidence unchanged. Close remains a separate action. On phones, the four selected-structure actions form a compact two-by-two grid with at least 44px targets.

Extended the existing phone/desktop explorer scenarios to activate the return action with the keyboard, assert the microscope is in view and focused, and compare the camera and explanation before/after. The play scenario checks preserved selection and mission evidence. Source syntax, scoped whitespace and mirror parity are checked separately.
All four extended browser scenarios passed at 280/320/1200px and in play mode. The 280px action grid was visually reviewed; syntax, scoped whitespace and all four cell mirrors passed. No push or deployment.

## Focused-label study view — 2026-09-19

Observe mode now offers Show only selected label in the active explanation panel. The renderer computes the full stable layout first, then draws and hit-tests only the selected label and leader. Next/Previous and the picker still navigate the complete anatomy list. Closing the explanation or changing specimens restores all labels until another structure is selected; turning the preference off restores them immediately. The preference is retained in cell settings and synchronized to the existing canvas without remounting it. Play mode ignores the filter, keeping mission labels available.

New browser coverage compares label rectangles and camera state before/after filtering, switches structures through both navigation routes, verifies hidden labels are not hover targets, checks dismissal/specimen-change recovery, and confirms a saved preference does not hide play labels. Phone and desktop screenshots capture the focused dish and its control.
All seven focused-view and explorer browser scenarios passed. Reviewed the 280px control and the 320px focused microscope/panel. Syntax, scoped whitespace and source/public/web-build/app-build parity passed. No push or deployment.

## Commit blocker resolved — 2026-09-19

After approval to proceed, verified that the root content engine is the documented canonical source and its stale desktop duplicate had no independent edits against HEAD. Synchronized that duplicate to the existing canonical working copy; the root was not changed. The source-pair guard now passes. Content-engine work remains outside the scoped cell commit. Cell implementation and validated behavior are unchanged.

## Responsive microscope split view — 2026-09-19

Observe mode now places the structure explorer beside the microscope when its available container is at least 1000px wide. A 320px sidebar keeps explanations readable while the microscope retains at least 640px of usable width. Narrow windows and embedded app panels stack the explorer below the dish. Play mode retains its full-width stage, and clearing the specimen restores a full-width observation stage.

The same DOM wrappers and canvas remain mounted across layout changes. The layout test resizes between desktop, a 900px app container and a 320px phone, checking canvas identity, preserved camera/selection/zoom and retained picker focus. Screenshots capture the full desktop workspace and both stacked variants. Existing explorer and focused-label scenarios verify navigation, stable label positions, keyboard return, touch cancellation and play behavior at the new sizes.
All nine explorer/focused-label/layout browser scenarios passed. Desktop split and phone stacked screenshots reviewed; source syntax, scoped whitespace and all four mirror copies passed. No push or deployment.

## Compact phone microscope toolbar — 2026-09-19

At narrow microscope widths, Labels, Center, Follow/Following and Notes now remain visible in one row with icons and short captions. Each control retains a large tap target; Labels still exposes the current Show labels/Hide labels action to assistive technology, and Notes retains the full Specimen notes accessible name. Desktop wording and the existing action behavior remain unchanged. No extra menu or disclosure is needed.

Browser checks cover 280/320/390/1200px layouts, four non-overlapping controls of at least 44px in each dimension, a phone HUD below 160px tall, steady toolbar height while following, keyboard activation, show/hide labels, centering, notes navigation and label clearance below the HUD. Existing motion-stability and touch-label scenarios are included.
All ten toolbar, motion-stability and touch-label browser scenarios passed. Reviewed 280px and desktop screenshots. Source syntax, scoped whitespace and four-way mirror parity passed. No push or deployment.

## Clearer phone zoom and speed controls — 2026-09-19

At microscope widths up to 640px, each utility card now gives its heading and value the full top row, with its slider and action button below. This separates Zoom from magnification even at 400× on a 280px display. The cards retain their existing height and 44px touch controls. The desktop layout is unchanged.

The toolbar browser checks now exercise maximum zoom/speed through the keyboard, measure heading separation and button clearance, confirm canvas zoom synchronization, and exercise reset and play/pause. Existing touch-label checks cover label access around the overlays.

All eight toolbar and touch-label browser scenarios passed at 280/320/390/1200px. Phone and desktop screenshots reviewed. Source syntax, scoped whitespace and four-way mirror parity passed. No push or deployment.

## Calmer organelle connectors — 2026-09-19

Hovering or selecting a structure now softens competing connector paths and their anchor dots. Active paths retain their strong outline and endpoint ring, while all label text and pills stay fully readable in the same stable positions. Clearing hover/selection restores the normal connector treatment. This also works with the existing selected-label study view and play labels; it introduces no animation or new control.

Existing focus checks cover desktop/phone hover, selection, dismissal, specimen changes and play interactions. The moving-specimen checks verify stable label rows across 120 frames at both sizes. Updated visual evidence is in reports/cell-label-focus.

All five existing focus and moving-label browser scenarios passed. Reviewed phone selection and desktop hover screenshots. Source syntax, scoped whitespace and four-way mirror parity passed. No push or deployment.

## Steady structure navigation — 2026-09-19

The explorer reading area now reserves the space needed for the selected specimen's longest rendered explanation. CSS grid sizing uses the actual heading, body text, font size and available width, so Previous/Next stay in place while browsing instead of following each description's length. Text remains fully wrapped with no fixed-height clipping or inner scrolling. Hidden sizing copies are excluded from assistive technology; only the active explanation is exposed.

The existing explorer browser checks now traverse all structures at 280/320/1200px, verify stable action-row position and retained keyboard focus, check a single accessible heading and unclipped descriptions, and repeat navigation at enlarged text sizes. Existing layout checks cover resizing between wide split view, narrow app containers and phones, plus full-width play mode.

All six explorer/layout browser scenarios passed, including larger-text navigation and play behavior. Phone and desktop sidebar screenshots reviewed. Source syntax, scoped whitespace and four-way mirror parity passed. No push or deployment.
