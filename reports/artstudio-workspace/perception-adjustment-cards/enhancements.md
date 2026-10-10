# Perception Lab: clearer adjustment cards

Each drawing setting now appears in its own card, keeping the setting label, current value, slider, exact-value field, unit, and Reset action together. The current value has stronger emphasis, and the precision row adapts to the space available.

Focus highlights the setting being adjusted. Invalid exact values appear in a bordered message that follows the text direction, while the existing native input and keyboard behavior remain intact. The layout accommodates enlarged text, long translations, right-to-left interfaces, dark and high-contrast themes, and forced colors.

The source change adds one stylesheet string only. Adjustment handlers, markup, accessible names, experiment calculations, saved data, and exports remain unchanged. All 588 English labels retain their values; no catalogs changed.

## Verification

- **18 focused native Chromium groups passed**, covering adjustment cards, exact-value editing and resets, invalid values, keyboard focus, disabled states, responsive layouts, enlarged text, translations, themes, and accessibility.
- **84 baseline scene/model/measurement cases passed**. Engine API and implementations, defaults, metadata, and measurements are unchanged. Removing the added CSS string restores the exact preceding source. Source and desktop copies match, and all **588 English catalog entries** agree with both runtime Perception catalogs.
- **11 screenshots** document nine final layouts, plus the preceding phone layout and a clean phone state. **Nine accessibility audits** are recorded in the native browser results; every audit reported no violations.
- No existing regression test file changed in this pass. No older browser suite was rerun. The Vitest/jsdom DOM suite remains unexecuted because its existing worker stalls before collection; native browser and pure-engine checks provide separate evidence.

Source SHA256: `c6843a06b8d247d0d3b3b52494202c3a7c9b7090fa42d13d3f13cd6ac27acd2c`.

## Evidence

- [Desktop adjustment cards](browser/adjustment-cards-1600.png)
- [Narrow phone adjustment cards](browser/adjustment-cards-320.png)
- [Phone adjustment cards](browser/adjustment-cards-390.png)
- [Previous phone layout](browser/adjustment-cards-390-before.png)
- [Phone adjustment cards without a validation message](browser/adjustment-cards-390-clean.png)
- [Adjustment cards at the mobile breakpoint](browser/adjustment-cards-700.png)
- [Adjustment cards at 200% text](browser/adjustment-cards-320-200.png)
- [Long labels and right-to-left layout](browser/adjustment-cards-long-rtl-320-200.png)
- [Dark adjustment cards](browser/adjustment-cards-dark.png)
- [High-contrast adjustment cards](browser/adjustment-cards-contrast.png)
- [Forced-color adjustment cards](browser/adjustment-cards-forced.png)
- [Verification summary](verification.json)
- [Browser evidence manifest](adjustment-cards-evidence-manifest.json)
- [Focused native results](browser/adjustment-cards-browser-results.json)
- [Baseline and catalog results](regression-validation.json)
- [Focused native regression runner](../../../dev-tools/perception_lab_adjustment_cards_qa.cjs)
- [Pure validator](validate-perception-adjustment-cards.cjs)

Run the pure validator with `node reports/artstudio-workspace/perception-adjustment-cards/validate-perception-adjustment-cards.cjs`. The included baseline is the preceding compact live inspector version.

No staging or commit was performed. All changes remain uncommitted.
