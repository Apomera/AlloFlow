# Final dashboard browser verification

**597/597 checks pass**, with **81 DOM snapshots**, **23 layout measurements**, and **18/18 clean scoped axe audits**.

Final source/public SHA-256: `d43969e8c5824b6f2b94b2b7e29b51ef33a24833495059c79cad6e9551951061`.

`results.json` records no failures or errors. The tested runtime stayed unchanged and matched the public mirror. Completion, success, browser cleanup, and server cleanup are all true.

## Measured improvement

At the 1280px viewport, the empty height below the storage bars falls from **747.7px to 59.5px**, a **92.0% reduction**. The open dashboard's height falls from **1133.1px to 1036.8px**, an **8.5% reduction**. The values card spans the full **980px grid**; its table fills the card's content width and expands its own row without stretching the plot or storage row.

The baseline uses frozen source `78d92400…` and remains preserved in `baseline-runtime.js`, `baseline-results.json`, and its original captures.

## Coverage and retained behavior

- Nine configurations cover 320/390/768/1280px viewports, dark, forced colors, dark with forced colors, and 620/390px embedded hosts at a 1280px viewport. A separate resize sweep covers 890/620/390/320px hosts and returns to wide layout.
- DOM order is plot, inspection, stores, table. Phone visual order matches it; desktop grouping is balanced. Stores have a visible heading and a resolving accessible name.
- Minimum checked rendered plot text is **12px**. Labels do not intersect, and the widget has no clipping or horizontal page overflow.
- Native selector and summary targets retain visible keyboard focus, 44px sizing, and correct tab order. All five locations' plotted coordinates, exact readout, and table values agree.
- Manual inspection, Follow, active stages, and replay focus retain their semantics. Replay changes focus while scores continue using current conditions.
- Selection, table expansion, and resizing preserve paused parcel progress, writing, saved baseline, and observation evidence.
- Forced-color labels, series, axes, gridlines, stage marker, and marker dot use system colors. Solid/dashed/dotted lines and circle/square/diamond symbols remain distinct, including dark with forced colors.

## Captures and preserved diagnostics

Final matched images use `final-dashboard-folded-*` and `final-dashboard-open-table-*`. Key review files are the light 320px and 1280px pairs, plus `final-dashboard-open-table-dark-forced-colors-1280.png`.

The 69-pass, three-case geometry preflight is preserved in `preflight-results.json` on the preceding layout source `280059b5…`. The final full run verifies the later system-color refinement. `preflight-results-initial.json` preserves the initial small-marker and changing-source diagnostic. `results-before-forced-axis-ink.json` and `diagnostics-before-forced-axis-ink/` preserve the completed run before adding explicit checks for SVG guide ink.

This task used an owned ephemeral server and isolated Chromium. It closed both resources and did not interact with learner tabs or port 8770, modify runtime files, stage changes, or commit.
