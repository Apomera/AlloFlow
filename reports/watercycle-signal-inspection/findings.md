# Signal dashboard baseline inspection

Frozen runtime SHA-256: `2ab8cb80d55de3063122677d50df18c4047ab1ad41fc198b86d5093ae9c83ccf`.

The owned browser rendered the actual Water Cycle runtime at 320px and 1280px in light, dark, and forced colors. It also selected Evaporation and Infiltration through the native stage buttons. All eight cases completed without browser runtime errors. The owned browser and ephemeral server closed.

## Concrete opportunities

1. **Correct the Infiltration location.** The native Infiltration selection shows the soil driver and soil-storage highlight, but its vertical chart marker and SVG description identify Surface. The missing standalone `infiltration` stage mapping falls back to index 0; active `infiltrating` uses Land. A test can select Infiltration and require Land in the marker and accessible description.
2. **Make phone chart labels readable.** At 320px the 420-wide SVG shrinks its 13px text to approximately 7.12px on screen. The phase locations and axis labels are difficult to read even though the dashboard fits without horizontal page scrolling. A responsive SVG layout plus ordinary HTML values can preserve both the overview and readable evidence. Verify the rendered font scale, label separation, and absence of clipping at 320px.
3. **Encode line identity beyond color.** Forced colors produces three black, solid lines; the legend swatches also all become the same purple. Energy and Surface flow have the same width, so the legend cannot identify them. Distinct dash patterns and series-specific shapes should match the legend and remain distinct in forced colors.
4. **Expose exact values for a chosen location.** The dashboard has no focusable controls, and its generic SVG description gives no series values. A native location selector, an exact readout, and an expandable table would support a concrete comparison while retaining the current-stage marker. Manual inspection should preserve the live parcel, writing, saved baseline, and other scenario settings.

## Captures

- `before-infiltration-light-320.png`
- `before-infiltration-light-1280.png`
- `before-infiltration-dark-320.png`
- `before-infiltration-dark-1280.png`
- `before-infiltration-forced-colors-320.png`
- `before-infiltration-forced-colors-1280.png`

Raw DOM, geometry, computed line styles, legend styles, and native-selection observations are in `baseline-results.json`. `inspect.cjs` serves the saved `baseline-runtime.js`, so later runtime edits cannot change these captures. No runtime or Git changes were made by this audit.
