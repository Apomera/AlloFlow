# Machine Lab pass 47: move directly from results to controls

Each changed-setting row in Compare a change is now a native button showing its label, saved and current values, and an Adjust action. Activating it focuses the corresponding slider and brings that control into view without changing any settings, camera state, pose, or saved data. The button exposes its target with aria-controls and its before/after values through aria-describedby. Rows have a minimum 44-pixel interaction height.

The comparison summary now shows Saved when the reference matches, or a live count such as 1 change or 4 changes. The count stays visible when the disclosure is collapsed and clears with the saved comparison. Native summary keyboard behavior is preserved.

Validation: **228 UI tests and 429 Chromium browser checks passed** across six stations, 1150/390/320-pixel layouts, and three themes. Checks cover keyboard navigation to the correct visible slider, state preservation, minimum row sizes, accessible target/description relationships, collapsed counts, save/replace/restore/clear behavior, four changed settings with distinct targets, saved markers, numeric comparison results, invalid references, reading-level boundaries, and horizontal overflow. Captured 36 screenshots and visually inspected light and dark phone layouts plus system high contrast. Source/desktop parity, syntax, and scoped whitespace checks passed. Existing React key warnings in other views remain.

- [Four changes on a phone](pass47-light/changes-multiple-320.png)
- [Dark phone comparison](pass47-dark/changes-multiple-320.png)
- [System high contrast](pass47-contrast/comparison-forced-colors.png)
- [Validation details](pass47-summary.json)

Runtime validation used Chromium without a physical touch-device or screen-reader session.

Changes remain local. No commit, push, or deployment was performed.
