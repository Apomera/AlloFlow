# Geometry World: Workspace Clarity

Date: October 3-4, 2026

## Changes

- Split the crowded Settings surface into Workspace, View, Learning, and Create tabs. Tabs support arrow keys, Home/End, roving focus, and a focus trap that excludes hidden panels.
- Added device-saved Standard/Larger interface text, Solid/Translucent panel backgrounds, top-bar visibility, coordinates, and station-compass preferences. Existing version-1 preferences migrate without losing their layout or toolbar choices; malformed values fall back safely.
- Appearance changes apply live without closing Settings. Storage failures explicitly report session-only changes. Optional panels are session choices, and manually selecting one reports a Custom layout instead of claiming the old preset is active.
- Reset workspace appearance changes presentation only. Live geometry, project identity, undo/redo, answer drafts, measurement evidence, and reflection text are retained.
- Made layout and camera selections visibly distinct, including check indicators and system-color support. Added visible lesson, language, and environment labels and 44px settings targets.
- Isolated Settings keyboard events from world shortcuts while retaining native select behavior. L/T/U no longer trigger scene commands from Settings.
- Added stable larger-text material tiles, a single-row scrolling action bar, and active-material scrolling after text-size changes. Placement hints no longer cover the action row.
- Improved the builder tool finder with category filters, clearer availability states, usable phone result space, larger text, solid surfaces, and readable forced colors. Empty-world Send to Print Lab stays unavailable without closing the finder.
- Removed redundant floating Home buttons when the quickbar already provides Home, preventing Settings overlap.
- Renamed the collapsed builder entry Studio with an explicit Free Build Studio accessible name. Portrait placement keeps it away from the build target and aiming cue; extra-short phones use a compact entry beside Position.
- On extra-short phones, widened the aiming cue and compacted the action rail without shrinking its 44px targets. The upper look controls remain reachable. Across portrait phones, opening Position temporarily hides the collapsed Studio entry and aiming cue; closing it restores both.
- Preserved all prior lesson pedagogy, measurement semantics, controlled answer drafts, and save-recovery behavior. Source and served desktop mirrors match.

## Verification

- **138 clean focused test cases:** [83 current workspace/display cases](workspace-final-tests.json) and [55 builder cases before the final Studio refinement](../sixth-builder-final-regressions.json). Earlier 80/18/12-case runs overlap these results and are not added to the total.
- Final Studio coverage reported 56 passing builder assertions: [46 across three files](../sixth-builder-studio-final-regressions.json) and a [clean standalone 10-case selected-inspector run](../sixth-builder-studio-selected-inspector.json). The 46-case aggregate omitted the fourth file and exited 1 despite reporting passing assertions; this is not claimed as a clean complete suite or added to the earlier totals.
- [20 direct current-source API checks](workspace-api-smoke.json) passed independently; these overlap the preference coverage above.
- [124 real-browser Settings checks](browser-report.json) passed at 1280x800, 390x844, 320x568, and 844x390, including 24 scoped axe audits with zero violations. The final run explicitly creates student blocks in a settled sandbox and verifies geometry/evidence retention, reload persistence, denied storage, keyboard isolation, contrast, and nonblank WebGL pixels.
- [16 final larger-text layout checks](layout-report.json) passed across the same viewports: material labels fit, the action row avoids the placement hint, the selected material stays visible after size changes, and the actual live scene remains nonblank. Some checks overlap the Settings matrix and are not combined into a unique-case count.
- Builder verification passed [29 finder/readability checks](builder/browser-report.json) with 12 zero-violation axe audits, plus [4 final empty-world checks](builder/empty-browser-report.json).
- [23 final Studio layout-contract checks](builder/studio-contract-browser-report.json) passed at 320x480, 320x568, and 390x844 on the final builder source, with private resources closed. They cover readable targets, cue clearance, Position open/close, unchanged expanded Studio, and retained student geometry. Toolbar-hidden/fullscreen assertions are CSS-state coverage, not a complete native-workflow matrix.
- [8 independent surface/system-color checks](independent-surface-report.json) passed on desktop and 320px phones.
- JavaScript syntax, scoped whitespace checks, and source/public SHA-256 parity passed.

## Verification Notes

Earlier attempts retain their failure evidence. Windows sandbox temp-cache permissions and delayed Vitest worker startup caused several zero-assertion launches. The workspace 83-case and pre-Studio builder 55-case runs completed cleanly. Final Studio aggregate limitations are qualified above; the attempted broader supplementary batch is not claimed as verified. See [workspace test status](workspace-test-status.json) and [builder notes](builder-notes.md).

The later Studio native-workflow retries also hit bounded state-wait timeouts. The latest attempt printed 24 passes and two timeouts but did not flush its final report because private cleanup stalled; its owned runner was closed. These attempts are not claimed as a clean native-workflow matrix. The separate layout-contract checks explicitly distinguish CSS-state coverage from native interaction coverage.

The preview harness previously marked Build ready before its final sandbox launch. Its readiness handshake was corrected, and the final browser run requires two real student meshes before testing preservation. Earlier navigation timeouts and palette-probe selector mistakes were superseded by the final clean browser/layout runs.

## Screenshots and Preview

[Desktop Settings](desktop-workspace-settings.png) | [Narrow-phone Settings](narrow-workspace-settings.png) | [Desktop readable palette](desktop-readable-palette.png) | [Narrow-phone Studio](builder/studio-contract-narrow-normal-standard.png) | [Short-phone Studio](builder/studio-contract-short-phone-normal-large.png) | [Portrait coordinate inspection](builder/studio-contract-tall-phone-position-open.png)

Local preview: http://127.0.0.1:61309/?mode=home

No deployment, dependency changes, or unrelated worktree cleanup was performed. This local React/Three.js harness does not validate the deployed host, remote services, physical touch devices, or WebXR hardware. Browser-close save recovery remains the previously documented follow-up.

Final core SHA-256: `50F8F7E65CE1759FD9D46C33CF6C4D441AC1CE793A720F3F06B0690D11422429`

Final builder SHA-256: `839701808B0AC211774FFBA84A2C4DF3195E65C7776C127FDBCCC1B4F18D8750`
