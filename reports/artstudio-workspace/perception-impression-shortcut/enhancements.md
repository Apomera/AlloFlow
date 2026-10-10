# Perception Lab: current-drawing impression shortcut

The current drawing now includes a compact impression prompt and the existing current-impression text. Choose an impression opens the adjustment controls and focuses the first choice. Once an impression is selected, Review impression opens the controls and focuses that selected choice.

Opening the shortcut is navigation only: it does not select an impression, record a result, write tool state, or change the saved model. The summary reflects the committed impression choice. The prompt belongs to the current drawing: it is hidden and inert when Switch shows the reference, and omitted from the combined Slide view. It remains available while matching results are being collected, and uses the existing disabled state once three matches are complete or another existing busy condition applies.

The presentation supports narrow screens, enlarged text, long labels, right-to-left layouts, dark and high-contrast themes, and forced colors. The existing impression-choice legend now wraps long translated text within its fieldset, preventing it from extending past a narrow workspace at enlarged text sizes. The two new English labels are Choose an impression and Review impression; all 584 existing labels retain their values. Engine calculations, exported engine function implementations, defaults, saved-data formats, and exports remain unchanged.

## Verification

- **18 focused native Chromium groups passed**, covering the current-drawing shortcut, opening adjustment controls, keyboard focus, saved-state preservation, matching boundaries, responsive layouts, themes, and accessibility.
- **84 baseline scene/model/measurement cases passed**. Engine API, exported function implementations, defaults, metadata, and measurements are unchanged. Source and desktop copies match. All **586 English catalog entries** agree with both runtime Perception catalogs.
- **9 screenshots and 9 accessibility audits** document the final layouts. Every audit reported no violations.
- No existing regression test file changed in this pass. No older browser suite was rerun. The Vitest/jsdom DOM suite remains unexecuted because its existing worker stalls before collection; native browser and pure-engine checks provide separate evidence.

Source SHA256: `15ed562020a011994c79ae707d448fa47b830cf8ff03352c7b82515110b77964`.

## Evidence

- [Desktop impression shortcut](browser/impression-shortcut-1600.png)
- [Narrow phone impression shortcut](browser/impression-shortcut-320.png)
- [Phone impression shortcut](browser/impression-shortcut-390.png)
- [Impression shortcut at the mobile breakpoint](browser/impression-shortcut-700.png)
- [Impression shortcut at 200% text](browser/impression-shortcut-320-200.png)
- [Long labels and right-to-left layout](browser/impression-shortcut-long-rtl-320-200.png)
- [Dark impression shortcut](browser/impression-shortcut-dark.png)
- [High-contrast impression shortcut](browser/impression-shortcut-contrast.png)
- [Forced-color impression shortcut](browser/impression-shortcut-forced.png)
- [Verification summary](verification.json)
- [Browser evidence manifest](impression-shortcut-evidence-manifest.json)
- [Focused native results](browser/impression-shortcut-browser-results.json)
- [Baseline and catalog results](regression-validation.json)
- [Focused native regression runner](../../../dev-tools/perception_lab_impression_shortcut_qa.cjs)
- [Pure validator](validate-perception-impression-shortcut.cjs)

Run the pure validator with `node reports/artstudio-workspace/perception-impression-shortcut/validate-perception-impression-shortcut.cjs`. The included baseline is the preceding live settings comparison version.

No staging or commit was performed. All changes remain uncommitted.
