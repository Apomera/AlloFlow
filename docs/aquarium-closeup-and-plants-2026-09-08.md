# Aquarium close-up inspection and plant forms — 2026-09-08

This pass makes the small organisms in a large tank inspectable without changing their modeled size. It also replaces generic plant silhouettes with fourteen identity-based growth forms. The prior sizing and species work remains in [the sizing notes](aquarium-sizing-and-species-2026-09-08.md).

## Inspection flow

**Inspect life and habitat** now sits immediately above the aquarium. The selected subject's readings appear directly below the viewport, before appearance, sizing, and ecosystem panels. The previous phone layout could put inspection more than 1,500 pixels below the scene when sizing was open.

Select a resident, plant, or habitat object, then choose **Focus selected**. The camera frames the selected resident instance or plant/habitat item and follows its visual position. Selecting another subject while close-up is active changes the focus. **Whole tank**, camera presets, and Home restore a tank view. Camera actions do not edit chemistry, time, residents, biomass, or experiment factors.

Keyboard orbit and zoom remain available during close-up. Focusing brings the canvas into view without smooth scrolling. Reduced motion and visual pause continue to use the existing renderer lifecycle; following a subject does not create another animation timer. A removed, quarantined, or zero-foliage subject cannot remain the active visible focus.

Plant inspection includes **Adjust plant size**, which opens the existing sizing disclosure and focuses that plant's numeric biomass control. It does not apply an edit or alter any value; the explicit Apply step remains required.

## Plant forms and scientific scope

The shared `getAquariumPlantVisualProfile` uses stable catalog IDs, not names or loose text matching. Each profile supplies a growth form, visible distinguishing features, variation, scale explanation, and model note. [The plant review](aquarium-plant-visual-follow-up-2026-09-08.md) records source support and uncertainties.

The fourteen forms distinguish simple Java fern fronds and Anubias leaves on exposed rhizomes; a sword rosette; a branching moss mat; hornwort whorls; divided wisteria; paired Rotala leaves; sedge tufts; a round-leaf creeping carpet; duckweed and red-root floater; Chaetomorpha filaments; Caulerpa stolons and fronds; and an emergent mangrove seedling. Mangrove leaves remain above the water with developing roots below. Biomass is the existing relative index; body geometry is not stretched when tank volume changes.

Floating and emergent plant inspection explicitly notes that the simulator still applies shared simplified gas-flow estimates. The visual pass does not claim species-specific dissolved-water contributions or a new aerial carbon model. The mangrove salt fact now distinguishes root salt exclusion from leaf-gland secretion. Broader care-library claims have not received an exhaustive review in this pass.

## Verification

**161 targeted checks across 12 files pass.** The 124 model, React UI, bridge, sizing, feeding, and profile checks are recorded in `.codex-artifacts/aquarium-visual-qa/closeup-app-regression.json`. The final 37 renderer checks, including all fourteen plant forms, subject tracking, real-surface picking, camera bounds, and disposal, are in `closeup-renderer-regression.json` in the same folder. The final change only cleans up plant materials; it does not change geometry, behavior, or the model.

Real React/WebGL checks at 1440px and 390px, including reduced motion, pass without console errors. They cover nearby keyboard inspection, individual resident identity, the plant-size shortcut, zero/removal fallback, Home and presets, context recovery, and simultaneous 200-gallon resizing with geometry-quality replacement. The camera keeps the selected subject visible without enlarging its body. Paused and reduced-motion views have no continuing draw loop. See `focus-v4-verified/report.json` in the evidence folder.

All fourteen actual catalog/bridge plant forms were captured at 75% relative biomass in `plants-v4-verified/`. Visual review verified carpet leaves above the sand, unobscured mangrove roots and stem, and clean fish close-ups without an oversized selection ring. The visual matrix was captured on SHA-256 `d6956eb4c7144ad5543e42da8eb56178c2a67d75f0e24e23ac906339cf50b426`; the subsequent resource cleanup changes no drawing output.

The final lifecycle test verifies that zero-biomass plants allocate no materials and that unused and attached plant resources are disposed exactly once through quality replacement, removal, and scene disposal. Source syntax checks pass, and the source and desktop mirror are byte-identical at SHA-256 `b3adbced34fbbb3f8a3919bcdaf47a51d71dca5dd1ab2af2f83bdf070c1dc795`.

A final browser lifecycle smoke on those exact delivery bytes also passes: three zero/regrowth and quality-rebuild cycles preserve focus recovery, clock, stock, and chemistry; unmount/remount works; both scene disposals return GPU geometry and texture counts to zero. Rendered materials are released, and unused constructor-only fish palette allocations are collectible. See `focus-v4-lifecycle-final-verified/report.json` in the evidence folder. There are no browser errors.

Implementation checks establish rendering and interaction behavior. These plant forms and relative biomass scales do not establish calibrated physical dimensions, biological rates, or photorealism.
