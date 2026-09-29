# Water Cycle visual design

This pass brings the surrounding interface closer to the recent experiment and decision panels.

## Navigation and Explore

- A consistent set of decorative line icons identifies the five modes. Text labels and accessible names remain the primary navigation cues.
- The selected mode has a filled background and an underline. Keyboard focus remains distinct from selection.
- On narrow screens, the five choices use two columns with the last choice spanning the row. Labels can wrap without being clipped.
- Explore uses pale paper surfaces, dark teal text, and forest accents. The map has a quieter frame so its water paths and labels remain prominent.
- View switches, stage panels, learning drawers, and section navigation share spacing, borders, and control shapes.
- Dark, high-contrast, forced-color, and reduced-motion settings retain explicit treatments. The decorative animation badge is hidden for reduced motion.

## Landscape

The 2D material palette uses softer greens, muted earth, teal water, and cooler distant land. Geometry, process paths, scientific labels, climate responses, and model calculations remain intact. On narrow screens, label placement searches enough of the canvas to clear the wrapped corner overlays.

## Storm Lab and Steward

Storm Lab uses larger labels, clearer control groups, and the paper/teal palette of its experiment workspace. Steward uses forest tones and consistent cards around its campaign choices, score displays, and decision previews.

The changes use local CSS, SVG icons, and the existing canvas drawing code. No external font or image service is required.

## Review

The browser review scripts capture representative desktop and narrow layouts, exercise navigation and focus, and inspect accessible contrast. Results and screenshots are stored alongside each script's report output. Functional regressions cover the existing scientific views and controls.

Verification from the first visual pass:

- 72 layout and interaction checks passed across desktop and 390px/320px layouts, including keyboard mode switching and visible focus.
- 51 scoped accessibility audits covered shared navigation, Explore controls, and additional high-contrast surfaces. Two Steward findings were corrected and passed targeted follow-up audits at 1280px and 320px.
- Storm Lab and Steward passed 18 light/dark browser audits, plus the two high-contrast follow-ups, with no horizontal overflow or browser errors.
- Forced-color selection was reviewed visually and corrected with system colors; the follow-up navigation audit passed. The corrected 320px map was also reviewed in light and dark themes.
- All 19 final host-surface and label-placement regression tests passed. The existing terrain, readable-ink, and 2D process/visual checks also passed during the visual work.
- All seven full-screen tests passed on the final isolated run. The teardown deadline now allows Playwright's built-in shutdown fallback to finish on Windows; the original 30-second deadline expired just as that fallback began.
- JavaScript syntax and whitespace checks passed. The source and desktop public runtime copies have identical SHA-256 hashes.

See [shared visual review](../reports/watercycle-visual-system/README.md) and [Storm Lab/Steward review](../reports/watercycle-mode-visual-polish/README.md) for screenshots and scope. The preview can be served with `node dev-tools/watercycle_visual_system_qa.cjs --serve` at `http://127.0.0.1:8770/`.

The continuation extends the palette into Be the Water, Water Worlds, and Explore's experiment workspace. Climate values and explanations are larger, ground choices have clearer selected states, and prediction choices use generous targets. Baseline and current comparison bars occupy separate rows so both remain visible. The climate readout describes the selected scenario instead of diagnosing fog, snow, or rainbows from inputs that do not establish those conditions.

The pilot's route cards and notebook use quieter surfaces, larger evidence text, and controls that wrap on phones. Water Worlds groups its scene lenses, adds decorative icons, shows a check on selected ground cover, and arranges readings as rows on the smallest screens. See [Explore follow-up](../reports/watercycle-learning-polish/README.md), [pilot review](../reports/watercycle-pilot-visual-finish/README.md), and [Water Worlds review](../reports/watercycle-worlds-visual-finish/README.md).
