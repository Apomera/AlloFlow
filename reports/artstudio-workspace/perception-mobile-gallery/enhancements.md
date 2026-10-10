# Perception Lab: mobile experiment preview gallery

At viewport widths up to 700px, a collapsible gallery lets participants browse the starting drawings for all seven experiments alongside the existing experiment picker. Each preview includes the experiment name and family, and the selected experiment has a visible current label.

The drawings are static previews of the default starting scenes. They do not represent the participant's current settings or recorded results. Choosing a preview uses the existing experiment selection behavior, closes the gallery, and returns keyboard focus to the picker. Settings, notes, notebook records, and unrelated tool state are preserved. When the viewport crosses the mobile breakpoint, focus transfers between the picker or gallery and the selected desktop experiment button.

The gallery supports enlarged text, long labels, right-to-left layouts, dark and high-contrast themes, and forced colors. It adds two English labels; engine calculations, exported engine function implementations, defaults, saved data, and exports remain unchanged.

## Verification

- **16 focused native Chromium groups passed**, covering gallery navigation, static default preview drawings, selection and state preservation, keyboard operation, focus on resize, responsive layouts, enlarged text, translated labels, themes, and accessibility.
- **84 baseline scene/model/measurement cases passed**. Engine API, exported function implementations, defaults, metadata, and measurements are unchanged. Source and desktop copies match. All **579 English catalog entries** agree, including the two new labels.
- **9 screenshots and 9 accessibility audits** document the final layouts. Every audit reported no violations.
- No older browser suite was rerun in this pass. The Vitest/jsdom DOM suite remains unexecuted because its existing worker stalls before collection; native browser and pure-engine checks provide separate evidence.

Source SHA256: `2a8adbc0910ef6ac600388115c5cccb447484ef099be6eff7430f6870977c572`.

## Evidence

- [Desktop experiment navigation](browser/mobile-gallery-desktop.png)
- [Phone preview gallery](browser/mobile-gallery-390.png)
- [Gallery at the mobile breakpoint](browser/mobile-gallery-700.png)
- [Phone gallery at 200% text](browser/mobile-gallery-320-200.png)
- [Long labels and right-to-left layout](browser/mobile-gallery-long-rtl-320-200.png)
- [Dark preview gallery](browser/mobile-gallery-dark.png)
- [Verification summary](verification.json)
- [Browser evidence manifest](mobile-gallery-evidence-manifest.json)
- [Focused native results](browser/mobile-gallery-browser-results.json)
- [Baseline and catalog results](regression-validation.json)
- [Focused native regression runner](../../../dev-tools/perception_lab_mobile_gallery_qa.cjs)
- [Pure validator](validate-perception-mobile-gallery.cjs)

Run the pure validator with `node reports/artstudio-workspace/perception-mobile-gallery/validate-perception-mobile-gallery.cjs`. The included baseline is the preceding notebook observation cards version.

No staging or commit was performed. All changes remain uncommitted.
