# AlloFlow WCAG 2.2 AA Current Audit

**Audit date:** July 11, 2026
**Engineering target:** WCAG 2.2 Level A and AA
**DOJ Title II regulatory baseline:** WCAG 2.1 Level A and AA

## Scope and interpretation

This report evaluates the current local desktop command center and the bundled AlloFlow application shell. The May 2026 VPAT was used as historical context, not as evidence of current conformance. Automated results apply only to the rendered states and viewports listed below. They do not establish full-product conformance across every tool, modal, generated output, assistive technology, or user workflow.

## Methods

- axe-core 4.12 through the repository's Puppeteer audit harness, with WCAG 2.0, 2.1, and 2.2 Level A/AA tags.
- Custom runtime checks for landmarks, bypass navigation, visible focused states, labels, live regions, canvases, and redundant-entry hints.
- Source review and focused Vitest regression tests.
- Reflow probes at 640 CSS pixels (200% equivalent from a 1280px baseline) and 320 CSS pixels (400% equivalent).
- Production desktop rebuilds before rendered application verification.

## Verified results

| Surface/state | Viewport | axe result | Additional result |
|---|---:|---:|---|
| Desktop command center, initial App pane | 1280 x 800 | 0 violations; 44 passes | 72 focusable elements; 0 custom violations |
| Bundled AlloFlow application shell, initial state | 1280 x 800 | 0 violations; 46 passes | 104 focusable elements; 0 custom violations |
| Bundled application, reflow probe | 640 x 800 | 0 violations | No document overflow and no off-screen interactive controls |
| Bundled application, narrow reflow probe | 320 x 800 | 0 violations | No document overflow and no off-screen interactive controls after remediation |

## Remediation completed in this audit

- Upgraded automated axe coverage to include WCAG 2.2 A/AA tags.
- Added rendered checks for application readiness and corrected false-positive focus, hidden-input, dialog, and target-size heuristics.
- Added desktop bypass navigation, named/synchronized tabs, arrow-key tab navigation, visible focus styling, hidden-button behavior, and sufficient contrast.
- Corrected a desktop service-worker scope leak that could serve the command center inside the bundled app route.
- Named the AI backend dialog, removed an interactive modal backdrop, added Escape handling, and corrected reset-button text contrast.
- Added non-empty accessible-name fallbacks for the global mute control.
- Placed application heading, AlloBot, and save/sync status content within appropriate landmarks or live regions.
- Added labeled Move up/Move down alternatives and live position announcements to the draggable timeline editor (WCAG 2.5.7).
- Added labeled Move up/Move down alternatives, keyboard instructions, and live position announcements to draggable Persona blueprint items (WCAG 2.5.7).
- Added bounded arrow-key positioning, Shift-modified larger steps, instructions, and live movement announcements to the draggable AlloBot control (WCAG 2.5.7).
- Added bounded arrow-key positioning, Shift-modified larger steps, accessible instructions, and live movement announcements to draggable stickers, text notes, and voice notes (WCAG 2.5.7).
- Added bounded arrow-key positioning, Shift-modified larger steps, shared instructions, and live movement announcements to visual labels and leader-line anchors (WCAG 2.5.7).
- Enlarged visual-panel drawing colors, animation playback, frame deletion, duplication, and reordering controls to at least 24 by 24 CSS pixels (WCAG 2.5.8).
- Enlarged annotation deletion, color, line-width, clear, and template controls to at least 24 by 24 CSS pixels (WCAG 2.5.8).
- Enlarged immersive-reader focus, background, and text color controls to at least 24 by 24 CSS pixels (WCAG 2.5.8).
- Enlarged teacher-roster group colors and remove-student actions to at least 24 by 24 CSS pixels (WCAG 2.5.8).
- Replaced mouse-only cast-lobby name, role, and appearance editors with named keyboard-operable buttons, preserved name heading structure, and enlarged the remove-character target to 24 by 24 CSS pixels (WCAG 2.1.1, 2.4.7, 2.5.8, 4.1.2).
- Added a named modal dialog, initial focus, focus containment and return, Escape dismissal, keyboard-operable ARIA tabs, and a 24 by 24 animation control to Visual Supports (WCAG 2.1.1, 2.4.3, 2.4.7, 2.5.8, 4.1.2).
- Removed invalid image-wrapper and select dialog roles, removed a duplicate accessible name, exposed hidden image actions on focus, enlarged image/phoneme actions to 24 by 24 CSS pixels, and added named non-drag phoneme reorder buttons (WCAG 2.1.1, 2.4.7, 2.5.7, 2.5.8, 4.1.2).
- Added Enter/Space operation and pressed-state exposure to all six Word Sounds source selectors, and removed the disabled lesson-plan selector from sequential focus (WCAG 2.1.1, 2.4.3, 4.1.2).
- Replaced FAQ sentence audio spans with named native buttons and replaced the accordion row containing nested controls with a dedicated 32 by 32 expand/collapse button (WCAG 2.1.1, 2.4.3, 2.4.7, 2.5.8, 4.1.2).
- Removed focusable button semantics from the Learning Hub and Educator Hub backdrops and added initial dialog focus, Tab containment, Escape dismissal, and trigger focus return (WCAG 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Added a named Kokoro offer dialog with a non-interactive backdrop, initial focus, Tab containment, Escape dismissal, and trigger focus return (WCAG 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Added presentation-only backdrop semantics, initial focus, Tab containment, Escape dismissal, and trigger focus return to the live-session dialog (WCAG 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Added initial focus, Tab containment, Escape dismissal, and trigger focus return to the named Hints dialog (WCAG 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Removed full-screen button semantics from the Info/About backdrop; named the dialog; added initial focus, Tab containment, Escape dismissal, and focus return; and exposed its five-section selector as an arrow-key-operable ARIA tablist (WCAG 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Added initial focus, Tab containment, Escape dismissal, and focus return to the XP dialog, and exposed its visual level meter as a named progressbar with programmatic bounds and current value (WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Replaced nested Study Timer dialogs with one named modal and a presentation-only backdrop; added initial focus, Tab containment, Escape dismissal, and focus return; and exposed remaining time and completion percentage programmatically (WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Updated the shared confirmation surface to a named alert dialog that initially focuses Cancel, contains Tab navigation, dismisses with Escape, restores invoking focus, and no longer maps window-level Enter directly to destructive confirmation (WCAG 2.1.1, 2.4.3, 2.4.7, 3.2.2, 4.1.2).
- Added a named and described, focus-contained large-file transcription dialog with Escape and backdrop dismissal disabled consistently while busy, focus return on close, polite processing updates, and a programmatic chunk progressbar (WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.7, 3.2.2, 4.1.2).
- Added a named, focus-contained Brand Settings dialog with Escape dismissal and focus return; stacked its three regions for narrow-width reflow; explicitly named editable color, logo, header, and footer fields; exposed invalid color values and live validation; and enlarged profile actions to 24 CSS pixels (WCAG 1.3.1, 1.4.10, 2.1.1, 2.4.3, 2.4.7, 2.5.8, 3.3.1, 3.3.2, 4.1.2).
- Replaced focusable Adventure ledger and inventory backdrops with presentation-only layers; named both dialogs; added stable initial focus, Tab containment, Escape dismissal, focus return, and visible close-button focus indicators; and hid fallback inventory emoji from assistive technology (WCAG 1.1.1, 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Connected Quick Start Escape dismissal to its existing focus trap; added polite step announcements and programmatic four-step progress; corrected misleading Back and Finish accessible names; and enlarged Skip, help-dismiss, language-remove, and interest-remove targets to at least 24 CSS pixels (WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.7, 2.5.8, 4.1.2).
- Moved Guided Mode full-lesson dialog semantics from the clickable backdrop to the focus-managed panel, connected its accessible name to a real heading, hid the decorative book emoji, and identified the keyboard-scrollable lesson content as a named region while retaining focus containment, Escape dismissal, and focus return (WCAG 1.1.1, 1.3.1, 2.1.1, 2.4.3, 4.1.2).
- Repaired shared Teacher Gate, Role Selection, Student Entry, and Student Welcome surfaces: added named/described dialogs and Escape-connected focus traps; corrected unconditional password errors with aria-invalid, contextual description, and alert output; removed unrelated Parent/microphone/entry/welcome accessible-name overrides; announced microphone and codename changes; and enlarged the text Cancel target to 24 CSS pixels (WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.7, 2.5.8, 3.3.1, 3.3.2, 4.1.2).
- Moved onboarding-coach dialog semantics from clickable backdrops to named/described focus-managed panels; added Tab containment, Escape dismissal, and launcher focus return; implemented a Cancel-first consent alert dialog; hid and inerted the underlying coach while consent is active; and enlarged Start over to a 24 CSS pixel target (WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.7, 2.5.8, 3.2.2, 4.1.2).
- Separated Document Builder and image-description dialogs into independent named focus boundaries; removed their competing callback Tab traps; included the editable preview iframe in the main keyboard order; hid/inerted the builder during image description; connected contextual help to the nested dialog; and stacked settings above preview at narrow widths (WCAG 1.3.1, 1.4.10, 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Replaced the Notebook window-level Escape listener with panel-scoped focus management; moved Notebook and Note Insights semantics onto named/described panels; contained Tab navigation and returned focus; hid/inerted Notebook content while Insights is active; announced Insights loading and filtered-result counts; and allowed the footer to wrap at narrow widths (WCAG 1.3.1, 1.4.10, 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Moved Research Hub modal semantics from its backdrop to a named/described focus-managed panel; focused Close initially, contained Tab, added Escape dismissal and focus return; announced lane and educator-view changes; and connected the inquiry question to its visible instructions (WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.7, 3.3.2, 4.1.2).
- Moved Submission Inbox dialog semantics from its backdrop to named/described focus-managed panels; added initial focus, contained Tab, Escape dismissal, and focus return for the inbox and calibration-anchor dialog; programmatically named the audited form controls; and added explicit scope and accessible action names to both data tables (WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.7, 3.3.2, 4.1.2).
- Replaced Submission Inbox preset-import and preset-deletion browser confirmations with one named/described, focus-managed alert dialog; defaulted focus to the non-destructive action, contained Tab, supported Escape cancellation and focus return, and preserved the asynchronous overwrite decision before changing stored presets (WCAG 2.1.1, 2.4.3, 2.4.7, 3.3.4, 4.1.2).
- Added complete focus lifecycle, Tab containment, Escape dismissal, and focus return to Glossary interactive flashcards and phonics; replaced the phonics fake-button backdrop with a presentation layer; isolated the nested flashcard editor keyboard scope; exposed screener transitions as an atomic live status and progressbar; and made completed screener results a named focus-managed dialog with reduced-motion fallbacks (WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.7, 2.3.3, 4.1.2, 4.1.3).
- Made Simplified View Immersive Reader a named focus-managed dialog with nested-dialog-aware Tab and Escape handling; added initial focus, containment, Escape dismissal, focus return, and a presentation backdrop to phonics; announced cloze completion through an atomic polite status without moving focus; and added reduced-motion fallbacks to these layers (WCAG 2.1.1, 2.3.3, 2.4.3, 2.4.7, 4.1.2, 4.1.3).
- Added initial focus, Tab containment, Escape dismissal, nested-dialog isolation, and focus return to the PDF Diff Viewer; replaced both character-performance and rejection-reset browser confirmations with awaited named/described alert dialogs that default to the non-destructive choice (WCAG 2.1.1, 2.4.3, 2.4.7, 3.3.4, 4.1.2).
- Added a named/described focus-managed Group Session dialog with initial Close focus, Tab containment, Escape dismissal, focus return, and reduced-motion entry; added visible, resource-named Move earlier/later buttons as a keyboard and single-pointer alternative to drag reordering (WCAG 2.1.1, 2.3.3, 2.4.3, 2.4.7, 2.5.7, 4.1.2).
- Added visible keyboard/single-pointer Left, Right, Up, and Down controls as alternatives to dragging the Volume Builder visualization; retained named zoom controls, announced tilt/turn/zoom changes politely, and exposed a dynamic image description with shape, dimensions, and volume (WCAG 1.1.1, 2.1.1, 2.5.7, 4.1.2, 4.1.3).
- Made the Tour Overlay card a named focus-managed dialog with initial actionable focus, Tab containment, Escape dismissal, and focus return; announced step title/text changes atomically and politely; and added reduced-motion fallbacks to the spotlight pulse, beam, and card entry animations (WCAG 2.1.1, 2.3.3, 2.4.3, 2.4.7, 4.1.2, 4.1.3).
- Replaced four Story Forge student-record export browser confirmations with one awaited named/described alert dialog; preserved file-specific privacy warnings, defaulted focus to Cancel, contained Tab, supported Escape cancellation and focus return, and named the programmatically created draft-import file picker (WCAG 2.1.1, 2.4.3, 2.4.7, 3.3.4, 4.1.2).
- Made Word Sounds Review a named/described focus-managed dialog with initial Back focus, Tab containment, Escape handling, and focus return; replaced the early-probe browser confirmation with a named/described alert dialog that defaults to Continue probe; verified existing named phoneme reorder buttons as non-drag alternatives and classified its cleaned-up audio-readiness polling as non-user-facing timing (WCAG 2.1.1, 2.2.1, 2.4.3, 2.4.7, 2.5.7, 3.3.4, 4.1.2).
- Replaced Word Sounds Voice Pack deletion's browser confirmation with a named/described alert dialog; separated requesting consent from the destructive action, defaulted focus to Keep pack, contained Tab, supported Escape cancellation and focus return, and preserved the one-pack minimum guard (WCAG 2.1.1, 2.4.3, 2.4.7, 3.3.4, 4.1.2).
- Synchronized the Word Sounds setup-source review panel with the accessible runtime review: added named/described modal semantics, initial Back focus, Tab containment, Escape handling, and focus return; replaced its duplicated early-probe browser confirmation with the same safe-default named/described alert-dialog flow (WCAG 2.1.1, 2.4.3, 2.4.7, 3.3.4, 4.1.2).

- Replaced the teacher roster offline-submission key regeneration confirmation and setup-completion browser alert with a named/described alert dialog; defaulted destructive consent to Keep existing key, contained Tab, supported Escape dismissal, preserved the key-loss warning, and returned focus to the setup trigger (WCAG 2.1.1, 2.4.3, 2.4.7, 3.3.4, 4.1.2).

- Made the Escape Room teacher End game confirmation a named/described alert dialog; moved initial focus to the safe Cancel action, contained Tab, supported Escape cancellation, restored focus to the End game trigger, hid its decorative icon, and maintained 44 CSS-pixel action targets (WCAG 1.1.1, 2.1.1, 2.4.3, 2.4.7, 2.5.8, 3.3.4, 4.1.2).

- Corrected the teacher dashboard Clear all confirmation: removed button semantics and keyboard focus from the backdrop, changed the destructive prompt to a named/described alert dialog, focused the safe Cancel action instead of deletion, contained Tab, supported Escape and backdrop cancellation, restored focus to either Clear all trigger, added Space activation to the legacy card trigger, hid the decorative trash icon, and maintained 44 CSS-pixel actions (WCAG 1.1.1, 2.1.1, 2.4.3, 2.4.7, 2.5.8, 3.3.4, 4.1.2).

- Made the student Escape Room puzzle layer a named focus-managed dialog; moved initial focus to its named 44 CSS-pixel Close control, contained Tab, supported Escape dismissal, returned focus to the exact puzzle object, routed successful completion through the same focus-aware close path, and hid the decorative Close icon (WCAG 1.1.1, 2.1.1, 2.4.3, 2.4.7, 2.5.8, 4.1.2).

- Added programmatic names, state announcements, and focus transitions to student Escape Room full-screen states: waiting is a polite busy status, game over is an alert, escape success is a named status, the active room is a named region, pause is a named/described alert dialog, focus returns to the active room on resume, team escapes are polite atomic status messages, and confetti is hidden from assistive technology (WCAG 1.1.1, 2.4.3, 2.4.6, 3.2.2, 4.1.2, 4.1.3).

- Implemented the WAI-ARIA tabs pattern for the Teacher Dashboard Students, Insights, Behavior, and STEM sections: added a named tablist, tab and tabpanel roles, selected state, bidirectional control/label relationships, roving tabindex, automatic activation, wrapping Arrow-key navigation, and Home/End support (WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.6, 4.1.2).

- Replaced Brand Profile deletion's native browser confirmation with a named/described alert dialog; separated the deletion request from execution, focused the safe Cancel action, contained Tab, supported Escape cancellation, restored focus to the originating Delete control or the editor Close fallback when the deleted row disappears, and provided 44 CSS-pixel dialog actions (WCAG 2.1.1, 2.4.3, 2.4.7, 2.5.8, 3.3.4, 4.1.2).

- Replaced Research Hub inquiry reset's native browser confirmation with a named/described alert dialog; separated reset request from execution, focused the safe Cancel action, contained Tab, supported Escape cancellation, restored focus to Reset or the Hub Close fallback, preserved the learner's developmental level, and provided 44 CSS-pixel actions (WCAG 2.1.1, 2.4.3, 2.4.7, 2.5.8, 3.3.4, 4.1.2).

- Replaced Memory Match's in-progress mode-switch browser confirmation with a named/described alert dialog; retained the current controlled selection until consent, focused the safe Cancel action, contained Tab, supported Escape cancellation, returned focus to the mode selector, and provided 44 CSS-pixel actions before restarting and clearing round progress (WCAG 2.1.1, 2.4.3, 2.4.7, 2.5.8, 3.2.2, 3.3.4, 4.1.2).

- Made the shared Multi-Zone Sort completion layer a named/described focus-managed dialog; retained initial Play again focus, contained Tab, supported Escape closing, returned focus to the game after replay, hid the decorative celebration emoji, provided 44 CSS-pixel actions, and suppressed dialog entry animation when reduced motion is requested (WCAG 1.1.1, 2.1.1, 2.3.3, 2.4.3, 2.4.7, 2.5.8, 4.1.2).

- Made Matching Game a named focus-managed full-screen dialog using a reusable game-workspace focus hook; focused its named 44 CSS-pixel Close control, contained Tab, supported Escape closing, restored focus to the launcher, and retained reduced-motion-aware entry (WCAG 2.1.1, 2.3.3, 2.4.3, 2.4.6, 2.4.7, 2.5.8, 4.1.2).

- Made Timeline Game a named focus-managed full-screen dialog using the shared game-workspace hook; focused its named 44 CSS-pixel Close control, contained Tab, supported Escape closing, restored focus to the launcher, hid the Close icon, retained reduced-motion-aware entry, and verified its existing keyboard lift/drop and move alternatives to dragging (WCAG 1.1.1, 2.1.1, 2.3.3, 2.4.3, 2.4.6, 2.4.7, 2.5.7, 2.5.8, 4.1.2).

- Made Concept Sort a named focus-managed full-screen dialog using the shared game-workspace hook; focused its named 44 CSS-pixel Close control, contained Tab, supported Escape closing, restored focus to the launcher, hid the Close icon, added reduced-motion-aware entry, and verified its existing keyboard select-and-place alternative to dragging (WCAG 1.1.1, 2.1.1, 2.3.3, 2.4.3, 2.4.6, 2.4.7, 2.5.7, 2.5.8, 4.1.2).

- Made Venn Sort a named focus-managed full-screen dialog and repaired its previously actionless victory overlay: added a named/described nested dialog, initial Play again focus, contained Tab, Escape closing, replay and Close actions, focus return to the workspace after replay, reduced-motion-aware entry, 44 CSS-pixel actions, and retained keyboard select-and-place alternatives to dragging (WCAG 2.1.1, 2.3.3, 2.4.3, 2.4.6, 2.4.7, 2.5.7, 2.5.8, 4.1.2).

- Consolidated Cause & Effect Sort onto the shared focus-managed full-screen dialog pattern and made its completion overlay a named/described nested dialog; added initial Play again focus, Tab containment, Escape closing, replay focus return, reduced-motion-aware entry, 44 CSS-pixel controls, and retained keyboard select-and-place alternatives to dragging (WCAG 2.1.1, 2.3.3, 2.4.3, 2.4.6, 2.4.7, 2.5.7, 2.5.8, 4.1.2).

- Consolidated T-Chart Sort onto the shared focus-managed full-screen dialog pattern and made its completion overlay a named/described nested dialog; added initial Play again focus, Tab containment, Escape closing, replay focus return, reduced-motion-aware entry, 44 CSS-pixel controls, and retained keyboard select-and-place alternatives to dragging (WCAG 2.1.1, 2.3.3, 2.4.3, 2.4.6, 2.4.7, 2.5.7, 2.5.8, 4.1.2).

- Consolidated the shared Multi-Bucket Sort component onto the focus-managed full-screen dialog pattern and made its completion overlay a named/described nested dialog; added initial Play again focus, Tab containment, Escape closing, replay focus return, reduced-motion-aware entry, 44 CSS-pixel controls, and retained keyboard select-and-place alternatives to dragging across all themed bucket variants (WCAG 2.1.1, 2.3.3, 2.4.3, 2.4.6, 2.4.7, 2.5.7, 2.5.8, 4.1.2).

- Made Pipeline Builder a named focus-managed full-screen dialog and its completion overlay a named/described nested dialog; added initial Play again focus, Tab containment, Escape closing, replay focus return, reduced-motion-aware entry, 44 CSS-pixel controls, and retained the keyboard node-selection workflow for building connections without pointer dragging (WCAG 2.1.1, 2.3.3, 2.4.3, 2.4.6, 2.4.7, 2.5.8, 4.1.2).

- Made Syntax Builder a named focus-managed dialog with initial Close focus, Tab containment, Escape closing, launcher focus restoration, and a 44 CSS-pixel Close target; exposed completion as a named status, moved focus to Finish, hid decorative icons, and made workspace/completion entry honor reduced motion (WCAG 1.1.1, 2.1.1, 2.3.3, 2.4.3, 2.4.6, 2.4.7, 2.5.8, 4.1.2, 4.1.3).

- Reworked Crossword as a named focus-managed dialog and removed its focus-stealing, aria-hidden input and invisible full-screen keyboard overlay. The visible grid now exposes keyboard focus, permits Tab navigation, and receives focus after pointer or keyboard clue selection; Across and Down clues support Enter/Space activation, the Close target is 44 CSS pixels, decorative icons are hidden, completion is announced, and dialog entry respects reduced motion (WCAG 1.1.1, 1.3.1, 2.1.1, 2.1.2, 2.3.3, 2.4.3, 2.4.7, 2.5.8, 4.1.2, 4.1.3).

- Made Student Bingo a named focus-managed dialog with initial Close focus, Tab containment, Escape closing, and launcher focus restoration. Mark/unmark and win changes are announced; the board is named, playable cells retain Enter/Space operation and visible focus, the noninteractive free space is no longer exposed as a button, interactive targets meet 44 CSS pixels, decorative icons are hidden, and entry/stamp/win motion honors reduced-motion preferences (WCAG 1.1.1, 1.3.1, 2.1.1, 2.3.3, 2.4.3, 2.4.7, 2.5.8, 4.1.2, 4.1.3).

- Made Word Scramble a named focus-managed dialog with the guess field as its initial focus, Tab containment, Escape closing, and launcher focus restoration. Correct/incorrect answers, hints, skips, round progress, and completion are announced; focus returns to the guess field between rounds, controls expose strong keyboard focus, Close meets 44 CSS pixels, decorative icons are hidden, and game/feedback/completion motion honors reduced-motion preferences (WCAG 1.1.1, 2.1.1, 2.3.3, 2.4.3, 2.4.7, 2.5.8, 3.3.1, 4.1.2, 4.1.3).

- Made the teacher Bingo generator/caller a named focus-managed dialog with initial Close focus, Tab containment, Escape closing, launcher focus restoration, and a 44 CSS-pixel Close target. Card-count and caller-speed labels are programmatically associated; readiness, current clues, and autoplay changes are announced; history exposes disclosure state and controls its named region; autoplay exposes toggle state; caller navigation and exit controls have larger targets and visible focus; decorative icons are hidden; and modal, clue, audio, countdown, history, and press motion honors reduced-motion preferences (WCAG 1.1.1, 1.3.1, 2.1.1, 2.3.3, 2.4.3, 2.4.6, 2.4.7, 2.5.8, 3.3.2, 4.1.2, 4.1.3).

- Named Memory Game as a region and corrected its independently operable card board from invalid grid ownership to a labeled button group while retaining Enter/Space and arrow-key operation. Completion is announced and moves focus to Play again; mode, reset, fullscreen, and close controls have larger targets and visible focus; fullscreen exposes pressed state; decorative icons are hidden; and container, card-flip, hover, and replay motion honors reduced-motion preferences (WCAG 1.1.1, 1.3.1, 2.1.1, 2.3.3, 2.4.3, 2.4.6, 2.4.7, 2.5.8, 4.1.2, 4.1.3).

- Updated the shared MultiZone sorter used by Frayer, See-Think-Wonder, and Story Map with a named focus-managed outer dialog, initial Close focus, Tab containment, Escape closing, and launcher focus restoration. Reset, Close, and draggable/selectable items meet larger target sizes and expose visible focus; keyboard-selected items can now move to any zone or back to the bank without dragging; completion is announced; the nested win dialog isolates its keyboard handler while retaining Play again focus; the heading icon is hidden; and item entry, drop-zone scaling, confetti, and win entry honor reduced-motion preferences (WCAG 1.1.1, 2.1.1, 2.1.2, 2.3.3, 2.4.3, 2.4.7, 2.5.7, 2.5.8, 4.1.2, 4.1.3).

- Extended the shared MultiBucket sorter used by Concept Map, Problem/Solution, Fishbone, and Outline: completion, reset, and reset-cancellation changes are announced; item clicks no longer bubble into actionable parent buckets; placed/bank items, Reset, destination, return, cancel, and dialog actions meet larger target sizes with visible focus; the destination chooser is accurately nonmodal and Escape cancels selection without closing the game; timers are cleaned up; decorative hint/back icons are hidden; and dialog, win, hint, chooser, item-entry, active-drop, selection-scale, and press motion honors reduced-motion preferences (WCAG 1.1.1, 2.1.1, 2.1.2, 2.3.3, 2.4.3, 2.4.7, 2.5.7, 2.5.8, 4.1.2, 4.1.3).

- Upgraded reusable game controls across the module: theme and speech buttons now provide 44 CSS-pixel targets and strong keyboard focus, their visual-only emoji/icons are hidden, speech retains programmatic pressed state, and its playing pulse honors reduced motion. Shared post-game reviews are named regions with explicit screen-reader text for correct/incorrect status instead of color/glyph-only communication; Play again and Close meet 44 CSS pixels with visible focus and the replay icon is decorative (WCAG 1.1.1, 1.3.1, 1.4.1, 2.3.3, 2.4.6, 2.4.7, 2.5.8, 4.1.2).

- Replaced four Model UN native confirmations (skipping remaining speeches, advancing without adopted clauses, clause removal, and clearing session notes) with awaited accessible confirmation dialogs using descriptive action labels, safe cancel choices, warning/danger treatments, and fail-closed behavior when the accessible confirmation service is unavailable (WCAG 2.1.1, 2.4.3, 2.4.7, 3.2.2, 3.3.4, 4.1.2).

- Completed a second Venn Sort interaction pass: converted movable items to native 44 CSS-pixel buttons, separated speech playback from move activation to eliminate nested controls, contained the destination dialog with Escape/Tab handling and origin-item focus restoration, announced keyboard/drag errors, hints, correct placements, and completion, cleaned up hint timers, gated spatial animation and scaling for reduced motion, hid decorative icons, marked displayed set languages, and made the diagram area zoom-safe through scrolling (WCAG 1.3.1, 1.4.10, 2.1.1, 2.3.3, 2.4.3, 2.4.7, 2.5.7, 2.5.8, 3.1.2, 4.1.2, 4.1.3).

- Completed the Cause/Effect Sort interaction remediation: replaced simulated/nested item controls with native 44 CSS-pixel move buttons and separate speech actions, contained and named the destination dialog with Escape/Tab handling and origin-item focus restoration, announced keyboard and drag results, hints, completion, reset, and reset cancellation, cleaned hint/reset timers, added zoom-safe scrolling and focus indicators, gated spatial motion, and hid decorative icons (WCAG 1.3.1, 1.4.10, 2.1.1, 2.3.3, 2.4.3, 2.4.7, 2.5.7, 2.5.8, 4.1.2, 4.1.3).

- Completed the T-Chart Sort interaction remediation: replaced simulated and nested item controls with native 44 CSS-pixel move buttons and separate speech actions; contained and named the destination dialog with initial focus, Escape and Tab handling, backdrop cancellation, and origin-item focus restoration; announced incorrect-placement hints, completion, reset, and reset cancellation; cleaned up hint and confirmation timers; added zoom-safe scrolling and wrapping controls; gated spatial motion and scaling; and hid decorative icons (WCAG 1.1.1, 1.3.1, 1.4.10, 2.1.1, 2.3.3, 2.4.3, 2.4.7, 2.5.7, 2.5.8, 4.1.2, 4.1.3).

- Completed the shared Multi-Zone Sort interaction remediation used by Frayer, See-Think-Wonder, and Story Map: replaced simulated item controls with native 44 CSS-pixel buttons; changed zone and bank containers to labeled noninteractive groups; added a named dynamic destination dialog with initial focus, Escape and Tab containment, backdrop cancellation, and origin-item focus restoration; announced initialization, accurate corrective hints, completion, and reset; wrapped header controls and made the Frayer grid reflow to one column at narrow widths; retained a pointer-independent alternative to dragging; and preserved reduced-motion handling (WCAG 1.3.1, 1.4.10, 2.1.1, 2.3.3, 2.4.3, 2.4.7, 2.5.7, 2.5.8, 4.1.2, 4.1.3).

- Completed a second shared Multi-Bucket Sort interaction pass for Concept Map, Problem/Solution, Fishbone, and Outline: replaced simulated item controls and nested speech buttons with native 44 CSS-pixel move buttons plus separate speech actions; changed bucket destinations to labeled noninteractive groups; contained and named the dynamic destination dialog with initial focus, Escape and Tab handling, backdrop cancellation, and origin-item focus restoration; announced initialization and the correct destination after errors; reset selection and confirmation state; wrapped header controls and changed four-or-more bucket layouts to one column at narrow widths; retained a keyboard alternative to dragging; and preserved reduced-motion handling and timer cleanup (WCAG 1.3.1, 1.4.10, 2.1.1, 2.3.3, 2.4.3, 2.4.7, 2.5.7, 2.5.8, 3.3.1, 4.1.2, 4.1.3).

- Closed the residual Cause/Effect Sort destination-semantics gap: the Causes and Effects drop areas are now labeled noninteractive groups rather than simulated buttons that wrap native item and speech controls. Keyboard placement remains fully available through the contained destination dialog, while pointer dragging continues as an optional input method (WCAG 1.3.1, 2.1.1, 2.5.7, 4.1.2).

## Resolved finding

### A11Y-REFLOW-001 - Header controls rendered off-screen at 320 CSS pixels

**WCAG:** 1.4.10 Reflow (Level AA)
**Severity:** High
**Status:** Resolved and rendered-verified July 11, 2026.

The header settings, utility, language, and action clusters now use constrained, wrapping layouts below the small breakpoint. The Source panel action row also wraps its Upload, Load Project, Link, Generate, and Books controls instead of allowing its nested flex rows to exceed the panel width. Required functionality remains visible.

Verification at 320 x 800 CSS pixels found 0 axe WCAG A/AA violations, a 320px document scroll width, and 0 visible interactive controls outside the viewport. The 640px and 1280px checks also remain clean.

## Manual verification still required

- Complete keyboard-only walkthroughs of every major workflow and modal, including focus return and focus-not-obscured checks.
- NVDA + Chrome/Edge and VoiceOver + Safari testing across representative teacher and student workflows.
- Browser-native 400% zoom confirmation and WCAG text-spacing overrides across representative complex tools.
- Dragging alternatives for remaining drag-and-drop interactions beyond the remediated timeline, Persona blueprint, AlloBot, annotation, and visual-label controls (WCAG 2.5.7).
- Authentication flows and third-party identity providers (WCAG 3.3.8).
- Consistent help placement across multi-step processes (WCAG 3.2.6).
- Generated PDFs, documents, media, and AI-created content, which require their own output-level evaluation.

## Conformance statement

The tested initial states have no automated WCAG A/AA violations after remediation. Full WCAG 2.2 AA conformance is **not claimed** because the manual assistive-technology and representative-workflow verification matrix is incomplete.
