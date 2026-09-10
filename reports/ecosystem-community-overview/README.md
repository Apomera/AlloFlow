# Ecosystem community overview

Run a comparison in **Ecosystem → Food web**. The new **The whole community** panel appears beneath the optional 3D meadow.

## Added

- Five selectable cards show baseline and experiment trajectories, current biomass values, and signed differences together.
- Every card labels its own vertical scale. Within a card, baseline and experiment share that scale. Dashed/solid lines distinguish the runs, and yellow/purple markers identify disturbance and inspected time.
- Selecting a card updates the detailed chart, food-web inspector, and 3D species selection.
- Key-moment buttons inspect the start, sample just before the disturbance, disturbance time, end, largest absolute difference, and first difference of at least 0.1 biomass index for the selected group.
- Inspecting a key moment pauses meadow playback so the selected sample remains visible.
- Controls and excluded groups receive explicit explanations rather than invented milestones. Editing the model setup clears the overview along with the current comparison.
- Responsive cards and theme-aware text support keyboard selection, light/dark/high-contrast palettes, and narrow screens.

## Interpretation

Differences mean experiment minus baseline, not improvement or deterioration. Each species uses its own vertical scale, so curve heights should not be compared across cards. The 0.1 threshold locates display-sized differences; it does not establish ecological or statistical significance.

Key moments are computed directly from existing paired samples at 0.1 modeled-time intervals. Peak ties choose the earliest sample. Small nonzero differences remain distinct from exactly matching trajectories. No ecological equations or parameters changed in this enhancement.

## Screenshots

- [Desktop](desktop.png)
- [Dark theme](dark.png)
- [High contrast](contrast.png)
- [Mobile](mobile.png)

## Verification

Automated tests cover milestone calculations, exact ties, small differences, controls, excluded species, keyboard selection, shared timeline/scene/table values, pausing playback, responsive sizing, and clearing stale results. All 102 unit tests across 24 ecosystem files passed, along with six browser workflows. The overview workflow passed again after enlarging mini-chart labels. Syntax and scoped whitespace checks passed; source and desktop mirror SHA-256 hashes match.

Implementation: `stem_lab/stem_tool_ecosystem.js` and its desktop public mirror. Tests: `tests/ecosystem_community_overview.test.js` and `tests/e2e/ecosystem-community-overview.spec.ts`.
