# Aquarium sizing and species models — 2026-09-08

This pass connects tank and living-plant sizing to the aquarium model and gives every active resident catalog ID an explicit visual profile. See the [species audit](aquarium-species-visual-audit-2026-09-07.md) for identification evidence and the limits of broad catalog names.

## Tank size

Open **Tank & plant size** beside the live aquarium. Capacity accepts 5–200 **US gallons**, in half-gallon increments. Standard, long, tall, and cube layouts preserve the selected volume while changing proportions. Edits remain drafts until **Apply tank size**. The minimum also respects the largest catalog minimum among residents currently in the display tank. Stocking capacity and new-stock validation use the configured volume. Hospital residents do not set the display minimum while isolated; returning them requires the display tank to meet their catalog minimum and projected display bioload capacity again. Other hospital residents are excluded from that projected load.

Applying a size is a scenario edit: the clock pauses, individual IDs and health remain intact, and current water concentrations are retained. It does not simulate adding water, transferring fish, or an instantaneous dilution. Future steps use the new volume. An event and visible status explain the change.

Biological production and consumption, feeding impacts, and modeled equipment contributions scale against a 20-US-gallon reference. Atmospheric exchange additionally responds to the normalized surface-area-to-volume ratio. These are educational coefficients, not calibrated gas-transfer measurements or fluid dynamics. Heater behavior remains the existing temperature-control approximation; no claim of realistic thermal inertia is introduced.

The 3D vessel uses volume-preserving dimensions. Organism geometry is not stretched when the vessel changes. Layout coordinates remain normalized; placement, water, equipment anchors, and movement bounds follow the new vessel. Display geometry remains illustrative: the active catalog does not contain a complete, compatible physical-length and life-stage dataset.

## Living plants

Each plant listed under **Tank & plant size** has linked range and numeric controls, followed by **Apply plant size**. The value is the existing biomass index from zero to that plant's catalog maximum. It is not a measurement in grams or centimeters. Applying changes actual `plantBiomass`, so foliage and the plant's modeled oxygen, carbon dioxide, nutrient exchange, growth, and browsing contribution share one value.

A zero-biomass snapshot has no live foliage. The model may subsequently regrow biomass under its existing simplified growth equation. Manual edits are tracked separately from natural growth. Legacy duplicate entries of one plant ID share that ID's biomass; the control explains this. Photosynthetic stock such as kelp and coral retains its separate stock model and is not resized by these living-plant controls.

## Comparisons and saved work

Capacity, tank shape, and each manually resized plant are recorded as separate intervention factors. Current baselines with known tank dimensions remain available for comparison. An older baseline missing tank-volume metadata is cleared when a size is applied, with an explanation, to avoid presenting an unknown starting condition as controlled. Manual size changes invalidate a locked habitat observation's unchanged-design assumption. Ordinary plant growth does not count as a manual intervention.

Tank and plant sizes persist in the aquarium state and survive appearance resets. Invalid or unchanged edits do not mutate the model or advance time.

## Identification and limits

Every active catalog ID has an explicit profile describing its form, diagnostic markings, movement category, and meaningful variation. Models distinguish named tetra patterns, bottom-dwelling catfish forms, livebearers, cichlids, marine fish, reptiles, and invertebrates. Non-fish residents use their own morphology and locomotion.

Many catalog entries identify groups or trade names rather than one taxon. Their inspector identifies the rendered form as representative and explains variation. The work improves diagnostic anatomy and markings; it does not establish exact adult dimensions, sex, age, strain, or a complete husbandry validation for the library.

## Verification

All **139 targeted tests across 10 files pass** on the delivery source. They cover actual React controls, aquarium actions and one-hour model steps, draft/apply behavior, volume and shape effects, plant biomass, feeding, stock and hospital-return guards, experimental baselines, species profiles, diagnostic geometry, camera fitting, accessibility, motion preferences, and renderer disposal. The full result is saved in `.codex-artifacts/aquarium-visual-qa/sizing-species-delivery-tests.json`.

Browser checks at 1440px and 390px, including reduced motion, verify real WebGL rendering, all four shapes, saved reload, protected resident state, manual-versus-natural biomass changes, and whole-body bounds at 15-gallon tall and 200-gallon long extremes. Paused views render no continuing animation frames. The matrix is recorded in `.codex-artifacts/aquarium-visual-qa/sizing-v3-matrix/report.json`; the following current-source spatial pass is in `sizing-v3-final/report.json`.

All 36 active IDs were additionally rendered for visual review. This caught obscured rummynose tail bars, washed-out pigments, buried dorsal markings, and a cropped long-tank camera view. Corrected fin layers are visible from both sides; resident pigments now use the renderer's required color conversion; dorsal and ear markings sit on visible body surfaces. Default camera presets fit the complete physical vessel at desktop and phone aspect ratios. Existing user camera intent remains preserved through appearance changes.

The reviewed species sheets, individual model images, and tetra comparison are in `.codex-artifacts/aquarium-visual-qa/species-verified-v3/`. Final browser camera and hospital-return checks also pass at desktop and phone widths on the exact mirrored delivery bytes, with no console errors; see `.codex-artifacts/aquarium-visual-qa/camera-verified-v3/report.json`. Source and desktop mirror share SHA-256 `de0cc6e2553cfa2d0862b3343b81aa1224668af6f9b17ff1b5a3530f24c009ef`. Tests and images verify implementation behavior, not calibrated biological coefficients or photorealism.

The next pass adds selected-subject camera close-ups, nearby inspection controls, and fourteen detailed plant forms; see [the close-up and plant notes](aquarium-closeup-and-plants-2026-09-08.md).
