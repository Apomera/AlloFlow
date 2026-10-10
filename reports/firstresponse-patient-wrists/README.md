# First Response Lab: patient wrist refinement

The patient forearms now taper into the palms without an exposed circular cap or a flat wrist collar. The connection follows the existing forearm axis into each hand, including the bent wrist beside the cheek.

## Change

- Replace the two patient wrist ellipsoids with continuous skin connectors. Each has 48 points around 25 rings; both open ends are buried in the existing forearm and palm.
- Keep the original wrist object transforms, shared skin material, limb endpoints, palms, digits, nails, sleeves and recovery poses.
- Limit upper wrist relief to a shallow fold for this connector. The existing rescuer calls retain their original arithmetic.
- Reuse the same geometry and buffers through compression updates. No additional mesh or per-frame geometry allocation was introduced.

## Validation

- **335 unit checks in 11 files passed**, including 33 new connector cases and strict folded-versus-unfolded controls for all nine poses of each age.
- **Three Chromium workflows passed** with one worker and zero retries: adult, child and 320px infant. The saved baseline capture workflow passed separately.
- Actual rendered geometry checked across recovery poses 2, 3, 5 and 8, including arm framing, palm alignment, cheek wrist framing, keyboard inspection, 320/760px resizing, forced colors, app contrast, saved learner state and renderer cleanup.
- Four scoped accessibility scans found zero violations.
- The final probe checked **7776 forearm-cap samples**, **5184 connector-end vertices**, and **124416 faces** across all 54 wrists in 27 age/pose configurations. Every coverage, end-burial, topology and preservation check passed. The cap test allows 0.00002 model units for floating-point error; the browser checks require positive clearance. Minimum face/average-normal alignment is 0.956677. The earlier matched baseline probe exposed 29–48 cap samples per configuration, with a maximum normalized gap of 0.01127009.
- Twenty-seven fixed patient anatomy/frame hashes preserve every arm geometry except the two wrist buffers. Twenty-seven rescuer geometry/frame hashes match the baseline exactly in actual depth scenes.
- The maximum measured relative upper Y inset is 2.8000%; lateral, longitudinal and underside coordinates are exact against the unfolded control.
- Source and public copy are identical: SHA256 `877389b664177956a4801ab12952a247bc3a2c462961f92b648613dc83f08a5d`, 746208 bytes. Reversing only this pass's source edits restores the exact prior source. Other local work is preserved.

Clearance values use scene coordinates. The oblique-ray radial diagnostic is retained for inspection; it does not measure a global bulge bound.

## Visual evidence

Matched adult and infant views show the collar replaced by a continuous wrist taper. The bent cheek-support wrist retains its original placement without a visible hole or swollen joint. The complete hand remains readable in the palm close-up. Existing strong skin highlights remain.

Child captures also show connected wrists and readable fingers. App contrast preserves the wrist silhouette, while white hand/head surfaces still merge at fine cheek-contact details; this remains a visual refinement for a later pass.

| View | Before | Refined |
| --- | --- | --- |
| Adult palm | [Before](before/adult-pose-2-palm.png) | [Refined](adult-pose-2-palm.png) |
| Adult arms | [Before](before/adult-pose-5-arms.png) | [Refined](adult-pose-5-arms.png) |
| Adult cheek | [Before](before/adult-pose-5-cheek.png) | [Refined](adult-pose-5-cheek.png) |
| Infant palm on phone | [Before](before/phone-infant-pose-2-palm.png) | [Refined](phone-infant-pose-2-palm.png) |
| Infant cheek on phone | [Before](before/phone-infant-pose-5-cheek.png) | [Refined](phone-infant-pose-5-cheek.png) |

Additional captures: [child palm](child-pose-2-palm.png), [child cheek](child-pose-5-cheek.png), [contrast palm](phone-infant-contrast-palm.png), [contrast cheek](phone-infant-contrast-cheek.png).

## Diagnostics retained

The first connector exaggerated the inherited fourth-power fold because the normalized loft extends beyond the original unit sphere. The patient-only fold limit corrected it; see [fold diagnostic](fold-limiter-diagnostic.json).

The first native run missed one ray at a transformed palm triangulation seam in child pose 8. Only a zero-hit primary ray now permits two opposite offsets of one millionth of the model scale. Both must hit, and the worse clearance is measured against the exact original sample. All thresholds, samples and framing/state assertions are unchanged. Final fallback counts and clearances are in [validation.json](validation.json). The original [fixture](initial-browser-fixture.spec.ts), [log](initial-browser.log), [metrics](initial-browser-metrics.json) and browser artifacts remain available. That first run did not record a completed phone workflow; the fresh run completed all three workflows.

The initial unit run passed 332 of 335 checks and found a pinched inside-bend quad in adult poses 6–8. It produced opposing triangle normals before any fold relief. Extending the buried end to the unchanged palm centre gives that sharp bend a smooth transition; all hand frames stay fixed. The strict face-normal check remains unchanged. The [initial unit output](initial-unit.log) and [initial candidate source](initial-candidate.js) are retained.

## Reproduce

Run the eleven unit files listed in validation.json with Vitest, one fork worker, and the repository's existing geometry runner options. Run `tests/e2e/firstresponse-patient-wrists.spec.ts` with `reports/firstresponse-patient-wrists/playwright.config.ts` and the Chromium project. The optional baseline capture takes `FIRST_RESPONSE_WRISTS_BASELINE_SOURCE` pointing to `reports/firstresponse-patient-wrists/before.js`. The saved before/candidate sources also let the two numerical probe scripts run independently from this report folder.

[Unit output](unit.log), [native output](wrist-browser-corrected.log), [baseline output](baseline-browser.log), [source preservation](source-preservation.json), [final geometry metrics](depth100-validation.json), [earlier matched numerical probe](geometry-probe-metrics.json), [actual draw metrics](wrist-metrics.json).

No staging, commit, push or deployment. Changes remain local for review.
