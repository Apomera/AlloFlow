# Aquarium surfaces, lighting and compact inspection — 2026-09-08

This follow-up refines the visual presentation after [the close-up and plant pass](aquarium-closeup-and-plants-2026-09-08.md). It preserves catalog identity, residents, placement, relative biomass, simulation time and water chemistry.

## Environment and appearance

Floor reflections now use an irregular, periodic procedural texture with a softer default intensity. **Customize 3D view → Water shimmer** is a saved appearance setting from Off to 100%, defaulting to 40%. It scales the decorative reflection layer with effective modeled light output. Explicit zero stays off; a switched-off or zero-output installed fixture produces no shimmer. This is not a water-clarity, chemistry, oxygen or filtration measurement.

Wood, stone, substrate and trim now use consistent pigment color conversion. Reduced viewing fill light and glass opacity reveal material colors without a uniform pale haze. The sand texture also supplies subtle surface relief. Habitat contact shadows sit above the sand at the current tank height instead of disappearing inside it, while the waterline stays aligned with floating plant placement through resizing. Existing substrate, backdrop, exposure, detail and equipment controls remain available.

## Fish surfaces

Fish skin now uses a continuous body surface with procedural pigment maps. Belly tone, lateral stripes, bands, mottling and ocelli follow the body rather than intersecting it as raised objects. Diagnostic pattern selection still uses the existing catalog profile IDs, with representative forms and variations explained in inspection. Guppy tail spots and rummynose tail bars are drawn into the fin surface.

Fins use lightly curved membranes with finer internal rays and separate transparency for small clear fins and pigmented display fins. Eyes have less metallic rims. Body tessellation and texture resolution follow the existing detail control; crowded scenes retain the lightweight path. Mudskipper pupils now sit visibly outside their raised eye mounds. These changes preserve representative body dimensions, stock identity and the existing tail/fin motion interfaces. Texture and material ownership follows each mesh so rebuilding or removing a resident releases its resources. Matching pigment inputs share immutable CPU pixel buffers through a 32-entry / 8 MiB cache; each mesh owns a separate GPU texture, and scene disposal clears the CPU cache. All visual textures in this pass are generated locally in code.

## Inspection layout

Focus, return to the whole tank and zoom stay in the primary camera row. A native **Camera angles & help** disclosure holds the secondary presets and keyboard instructions. The disclosure starts closed, bringing selected-organism details closer to the viewport, especially on phones. Camera presets remain keyboard-accessible after expansion, and Home works with the disclosure closed. The selected-form and model-limit notes now use larger, darker text.

## Scope and verification

These are changes to appearance and inspection, not a calibration of biological rates or physical specimen dimensions. The models remain representative catalog forms; age, sex and strain variations are not exhaustively modeled.

**175 targeted checks across 14 files pass.** The delivery manifest at `.codex-artifacts/aquarium-visual-qa/visual-v5-delivery-validation.json` records the latest passing result for each file: 150 model, UI, bridge, plant, feeding and sizing checks plus 25 final renderer checks. The final checks cover two-sided pigments, curved fins, visible mudskipper pupils, body-size invariance, actual picking, cache limits and independent resource disposal. The initial regression report is retained separately; the final renderer result supersedes its outdated palette expectation and timed-out cases.

Real WebGL checks pass at 1440px and 390px, including reduced motion, plus a 320px keyboard/layout check. The compact disclosure, 44px primary targets, focus and camera resets, saved shimmer 0/1, lighting-off behavior, reload/reset and unchanged simulation state are verified. All 36 catalog residents were rendered; six mottled forms received a corrected recapture, and the last mudskipper eye change received its own final-hash specimen check.

Both tested scene unmounts return GPU geometry and texture counts to zero, with no tracked live materials or browser errors. One isolated comparison on this machine measured standard-scene non-render construction at about 367 ms after optimization versus 971 ms before it; graphics-renderer setup was measured separately. These are local measurements, not a device-independent performance guarantee.

The browser aggregate at `.codex-artifacts/aquarium-visual-qa/visual-v5-verified/report.json` links each capture/report to its source hash, including retained broad coverage and final bounded checks. Source and desktop mirror are byte-identical at SHA-256 `23007bf73210e099c8cc2b1d0de526ccf713e10b39718f6add4db4beb613d75e`.

Preview: [fish close-up](../.codex-artifacts/aquarium-visual-qa/visual-v5-candidate/motion-1440-neon-closeup.jpg), [compact phone inspection](../.codex-artifacts/aquarium-visual-qa/camera-v5-320-candidate/motion-320-compact-camera-ui.jpg), [corrected mottling](../.codex-artifacts/aquarium-visual-qa/species-v5-mottled-verified/contact-sheet-1.jpg).
